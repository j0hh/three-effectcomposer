/* eslint-disable no-underscore-dangle */

import * as THREE from 'three';

import ShaderPass from './ShaderPass';
import CopyShader from './CopyShader';
import MaskPass from './MaskPass';
import ClearMaskPass from './ClearMaskPass';


export default class EffectComposer {

	constructor( renderer, _renderTarget ) {

		let renderTarget = _renderTarget;

		this.renderer = renderer;

		if ( renderTarget === undefined ) {

			const parameters = {
				minFilter: THREE.LinearFilter,
				magFilter: THREE.LinearFilter,
				format: THREE.RGBAFormat,
				stencilBuffer: false,
			};

			const size = renderer.getDrawingBufferSize();
			renderTarget = new THREE.WebGLRenderTarget( size.width, size.height, parameters );
			renderTarget.texture.name = 'EffectComposer.rt1';

		}

		this.renderTarget1 = renderTarget;
		this.renderTarget2 = renderTarget.clone();
		this.renderTarget2.texture.name = 'EffectComposer.rt2';

		this.writeBuffer = this.renderTarget1;
		this.readBuffer = this.renderTarget2;

		this.renderToScreen = true;

		this.passes = [];

		this.copyPass = new ShaderPass( CopyShader );

		this._previousFrameTime = Date.now();

	}


	swapBuffers() {

		const tmp = this.readBuffer;
		this.readBuffer = this.writeBuffer;
		this.writeBuffer = tmp;

	}


	addPass( pass ) {

		this.passes.push( pass );

		const size = this.renderer.getDrawingBufferSize( new THREE.Vector2() );
		pass.setSize( size.width, size.height );

	}


	insertPass( pass, index ) {

		this.passes.splice( index, 0, pass );

	}


	isLastEnabledPass( passIndex ) {

		for ( let i = passIndex + 1; i < this.passes.length; i += 1 ) {

			if ( this.passes[ i ].enabled ) {

				return false;

			}

		}

		return true;

	}


	render( deltaTime = ( Date.now() - this._previousFrameTime ) * 0.001 ) {

		// deltaTime value is in seconds

		this._previousFrameTime = Date.now();

		const currentRenderTarget = this.renderer.getRenderTarget();

		let maskActive = false;

		let pass;
		let i;
		const il = this.passes.length;

		for ( i = 0; i < il; i += 1 ) {

			pass = this.passes[ i ];

			if ( pass.enabled !== false ) {

				pass.renderToScreen = ( this.renderToScreen && this.isLastEnabledPass( i ) );
				pass.render( this.renderer, this.writeBuffer, this.readBuffer, deltaTime, maskActive );

				if ( pass.needsSwap ) {

					if ( maskActive ) {

						const { context } = this.renderer;

						context.stencilFunc( context.NOTEQUAL, 1, 0xffffffff );

						this.copyPass.render( this.renderer, this.writeBuffer, this.readBuffer, deltaTime );

						context.stencilFunc( context.EQUAL, 1, 0xffffffff );

					}

					this.swapBuffers();

				}

			}


			if ( pass instanceof MaskPass ) {

				maskActive = true;

			} else if ( pass instanceof ClearMaskPass ) {

				maskActive = false;

			}


		}

		this.renderer.setRenderTarget( currentRenderTarget );

	}


	reset( _renderTarget ) {

		let renderTarget = _renderTarget;

		if ( renderTarget === undefined ) {

			const size = this.renderer.getDrawingBufferSize( new THREE.Vector2() );

			renderTarget = this.renderTarget1.clone();
			renderTarget.setSize( size.width, size.height );

		}

		this.renderTarget1.dispose();
		this.renderTarget2.dispose();
		this.renderTarget1 = renderTarget;
		this.renderTarget2 = renderTarget.clone();

		this.writeBuffer = this.renderTarget1;
		this.readBuffer = this.renderTarget2;

	}


	setSize( width, height ) {

		this.renderTarget1.setSize( width, height );
		this.renderTarget2.setSize( width, height );

		for ( let i = 0; i < this.passes.length; i += 1 ) {

			this.passes[ i ].setSize( width, height );

		}

	}

}
